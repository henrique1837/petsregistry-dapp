import React, { Component } from 'react';
import {
  Row,
  Col,
  Button,
  Spinner,
} from 'reactstrap';

import {withRouter} from 'react-router-dom';
import {
  Link,
} from 'react-router-dom';

import * as ResolverArtifact from '../contracts/Resolver.json';
const Box = require('3box');
const Config = require('../config.js');
const AppName = Config.AppName;
class TokenAttrs extends Component {
  state = {
    box: null,
    web3: null,
    ipfs: null,
    events: [],
    eventsCreated: [],
    minted: [],
    admins: [],
    transaction: null,
  }
  constructor(props) {
    super(props);
    this.getTokenAttrs = this.getTokenAttrs.bind(this);
  }
  componentDidMount = async function () {
    await this.setState({
      box: this.props.box,
      web3: this.props.web3,
      coinbase: this.props.coinbase,
      ipfs: this.props.ipfs,
      token: this.props.token,
      resolver: this.props.resolver,
      explorer: this.props.explorer
    });

    await this.setToken();

  }
  setToken = async () => {
    try{
      await this.setState({
        extensionSet: true,
        tokenAttrs: null,
        tokenId: null,
        image: null,
        txHash: null,
        warning: null
      })
      const tokenId = this.props.match.params.id
      const tokenAttrs = await this.getTokenAttrs();
      console.log(tokenAttrs)
      let vacines;
      let images;
      let family
      try{
        vacines = await Box.getThread(AppName,tokenAttrs.vacinesKey,tokenAttrs.owner,true);
        images = await Box.getThread(AppName,tokenAttrs.imagesKey,tokenAttrs.owner,true);
        family = await Box.getThread(AppName,tokenAttrs.familyKey,tokenAttrs.owner,true);

      } catch(err){
        console.log(err)
      }


      await this.setState({
        tokenId: tokenId,
        vacines: vacines,
        images: images,
        family: family,
        tokenAttrs: tokenAttrs
      });
    } catch(err){
      console.log(err);
      this.setState({
        warning: err.message
      })
    }
  }

  getTokenAttrs = async () => {
    //try{
      const tokenId = this.props.match.params.id;
      console.log(tokenId)
      const ipfs = this.props.ipfs;
      const tokenUri = await this.props.token.methods.tokenURI(tokenId).call();
      const attrs = JSON.parse(await ipfs.cat(tokenUri.replace('ipfs://ipfs/', '')));
      const name = attrs.name;
      const breed = attrs.attributes[1].value;
      const birthday = attrs.attributes[2].value;
      const resolverAddress = await this.props.token.methods.resolverOf(tokenId).call();
      console.log(resolverAddress)
      const resolver = new this.props.web3.eth.Contract(ResolverArtifact.abi,resolverAddress);
      const vacinesKey = await resolver.methods.get("vacines",tokenId).call();
      console.log(vacinesKey)
      const imagesKey = await resolver.methods.get("images",tokenId).call();
      console.log(imagesKey)
      const familyKey = await resolver.methods.get("family",tokenId).call();

      const owner = await this.props.token.methods.ownerOf(tokenId).call();

      const tokenAttrs = {
        tokenId: tokenId,
        owner: owner,
        uri: tokenUri.replace("ipfs://ipfs/",""),
        image: attrs.image,
        name: name,
        breed: breed,
        birthday: birthday,
        vacinesKey: vacinesKey,
        imagesKey: imagesKey,
        familyKey: familyKey
      }
      return(tokenAttrs)
    //}catch(err){
    //  console.log(err)
    //}

  }




  render() {
    return (
      <>

        {
          (
            !this.state.tokenAttrs &&
            (
              <center style={{paddingTop:'100px'}}>
                <Spinner color="primary" />
                <p>Loading ...</p>
              </center>
            )
          )
        }
        {
          (
            this.state.tokenAttrs &&
            (
              <>
              <Row className='mob' style={{ paddingBottom: '50px',paddingTop:'50px' }}>
                <Col lg={10}>
                  <h5>Pet's Name: {this.state.tokenAttrs.name}</h5>
                  <p>Breed: {this.state.tokenAttrs.breed}</p>
                  <p>Birthday: {this.state.tokenAttrs.birthday}</p>
                  <p>Owner: {this.state.tokenAttrs.owner}</p>
                  <p>URI: <a href={`https://ipfs.io/ipfs/${this.state.tokenAttrs.uri.replace('ipfs://ipfs/', '')}`} target='_blank'>{this.state.tokenAttrs.uri}</a></p>
                  <p>TokenId: <span className='mob-tiny'>{this.state.tokenAttrs.tokenId}</span></p>
                </Col>
                <Col lg={2} style={{ textAlign: 'center' }}>
                  <img src={this.state.tokenAttrs.image} style={{ width: '150px', verticalAlign: 'middle' }} />
                </Col>
              </Row>
              {
                (
                  this.state.vacines &&
                  (
                    <Row>
                      <Col lg={12}>
                        <h4>Vacines</h4>
                        {
                          this.state.vacines.map((post) => {
                            return(
                              <div style={{paddingTop:'10px'}}>
                                <p>Drug: {post.message.drug}</p>
                                <p>Laboratory: {post.message.laboratory}</p>
                                <p>Date: {post.message.date}</p>
                                <p>Expiration date: {post.message.exp_date}</p>
                              </div>
                            )
                          })
                        }
                      </Col>
                    </Row>
                  )
                )
              }
              <Row>
              {
                (
                  (this.state.family) &&
                  (
                    <>
                    <Col lg={12}>
                      <h4>Family</h4>
                    </Col>
                    {
                      this.state.family.map((post) => {
                        return(
                          <Col style={{marginTop:'20px'}} lg={4}>
                            {
                              (
                                post.message.tokenId &&
                                (
                                  <p>TokenId: <a href={`https://ipfs.io/ipfs/${post.message.tokenId}`} target='_blank'>{post.message.tokenId}</a></p>
                                )
                              )
                            }
                            <h5>{post.message.memberType}</h5>
                            <p>Name: {post.message.attrs.name}</p>
                            <p>Breed: {post.message.attrs.attributes[1].value}</p>
                            <p>Birthday: {post.message.attrs.attributes[2].value}</p>
                            <p>Type: {post.message.attrs.attributes[3].value}</p>
                            <center>
                              <img src={post.message.attrs.image} style={{width: '200px'}}/>
                            </center>
                          </Col>
                        )
                      })
                    }
                    </>
                  )
                )
              }
              </Row>
              <Row>
              {
                (
                  this.state.images &&
                  (
                  <>
                  <Col lg={12}>
                    <h4>Images</h4>
                  </Col>
                  {
                    this.state.images.map((post) => {
                      return(
                        <Col style={{textAlign:'center',marginTop:'20px'}} lg={4}>
                          <div>
                            <img src={`https://ipfs.io/ipfs/${post.message}`} style={{width: '200px'}}/>
                          </div>
                        </Col>
                      )
                    })
                  }
                  </>
                  )
                )
              }
              </Row>
              <div style={{paddingTop: '50px'}}>
                <Link to={"/tokens"} style={{all: 'unset'}}>
                  <Button color="primary" onClick={() => {/*that.setToken(id)*/}}>Return to tokens list</Button>
                </Link>
              </div>
              </>
            )
          )
        }
      </>
    );
  }

}
export default withRouter(TokenAttrs);
