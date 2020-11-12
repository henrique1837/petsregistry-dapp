import React, { Component } from 'react';

import { Link } from 'react-router-dom';
import {
  Container,
  Row,
  Col,
  UncontrolledCollapse,
  Nav,
  Navbar,
  NavItem,
  NavLink
} from 'reactstrap';
class Menu extends Component {
  state = {
    box: null
  }

  constructor(props) {
    super(props)
  }
  componentDidMount = function () {
    this.setState({
      box: this.props.box,
      isAdmin: this.props.isAdmin
    })
  }


  render() {

    return (
      <Navbar
        className="navbar-horizontal navbar-dark bg-primary mt-4"
        expand="lg"
      >
      <Container>

        <button
          aria-controls="navbar-primary"
          aria-expanded={false}
          aria-label="Toggle navigation"
          className="navbar-toggler"
          data-target="#navbar-primary"
          data-toggle="collapse"
          id="navbar-primary"
          type="button"
        >
          <span className="navbar-toggler-icon" />
        </button>
        <UncontrolledCollapse navbar toggler="#navbar-primary">
          <div className="navbar-collapse-header">
            <Row>
              <Col className="collapse-close" xs="12">
                <button
                  aria-controls="navbar-primary"
                  aria-expanded={false}
                  aria-label="Toggle navigation"
                  className="navbar-toggler"
                  data-target="#navbar-primary"
                  data-toggle="collapse"
                  id="navbar-primary"
                  type="button"
                >
                  <span />
                  <span />
                </button>
              </Col>
            </Row>
          </div>
          <Nav className="ml-lg-auto" navbar>
            <>
              <NavItem>
                  <Link to={"/home"}>
                    <NavLink>
                    Home
                    </NavLink>
                  </Link>
              </NavItem>
              {
                (
                  this.state.box &&
                  (
                    <>
                    <NavItem>
                        <Link to={"/mintTokens"}>
                          <NavLink>
                            Mint Tokens
                          </NavLink>
                        </Link>
                    </NavItem>
                    <NavItem>
                      <Link to={"/editToken"}>
                        <NavLink>
                          Edit Token
                       </NavLink>
                      </Link>
                    </NavItem>
                    </>
                  )
                )
              }

              <NavItem>
                <Link to={"/tokens"}>
                  <NavLink>
                    Tokens
                 </NavLink>
                </Link>
              </NavItem>
              {
                (
                  !this.state.box &&
                  (
                    <NavItem>
                      <Link to={"/login"}>
                        <NavLink>
                          Login
                       </NavLink>
                      </Link>
                    </NavItem>
                  )
                )
              }

            </>
          </Nav>
        </UncontrolledCollapse>
      </Container>

      </Navbar>
    )
  }
}
export default Menu;
